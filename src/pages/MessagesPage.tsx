import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pin, Send, Megaphone, Trash2, Loader2, Reply } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const MessagesPage = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      const authorIds = [...new Set(data.map((m) => m.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      const roleMap = Object.fromEntries((roles || []).map((r) => [r.user_id, r.role]));

      return data.map((m) => ({
        ...m,
        authorName: nameMap[m.author_id] || "Unknown",
        authorRole: roleMap[m.author_id] || "staff",
      }));
    },
    enabled: !!user,
  });

  const replyTarget = useMemo(
    () => (replyTo ? messages.find((m) => m.id === replyTo) ?? null : null),
    [messages, replyTo],
  );

  const notifyMessagePosted = async (content: string, isReply: boolean) => {
    const truncatedContent = content.length > 120 ? `${content.slice(0, 117)}...` : content;
    const title = isReply ? "New Message Reply" : "New Message";

    const { error } = await supabase.rpc("notify_all_active_users", {
      _title: title,
      _message: truncatedContent,
      _type: "message",
      _exclude_user_id: user!.id,
    });

    if (error) {
      console.error("Failed to create message notifications", error);
    }
  };

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const isReply = !!replyTo;
      const payload = replyTo
        ? { author_id: user!.id, content, parent_id: replyTo }
        : { author_id: user!.id, content };

      const { error } = await supabase.from("messages").insert(payload);
      if (error) throw error;

      await notifyMessagePosted(content, isReply);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setNewMessage("");
      setReplyTo(null);
      toast.success("Message posted");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to post message"),
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("messages").update({ pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
    onError: () => toast.error("Failed to update pin"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Message deleted");
    },
    onError: () => toast.error("Failed to delete message"),
  });

  if (!user) return null;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Messages</h1>

      <Card>
        <CardContent className="p-3">
          {replyTo && (() => {
            const snippet = replyTarget
              ? replyTarget.content.length > 80
                ? `${replyTarget.content.slice(0, 77)}…`
                : replyTarget.content
              : null;
            return (
              <div className="mb-2 p-2 bg-muted/50 rounded text-sm text-muted-foreground flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-medium">Replying</span>
                  {snippet && (
                    <span className="ml-1 italic truncate">"{snippet}"</span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 text-xs"
                  onClick={() => setReplyTo(null)}
                >
                  Cancel
                </Button>
              </div>
            );
          })()}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newMessage.trim()) postMutation.mutate(newMessage.trim());
            }}
            className="flex gap-2"
          >
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={replyTo ? "Write a reply..." : (isAdmin ? "Post an announcement..." : "Write a message...")}
              className="min-h-[44px] max-h-24 resize-none"
              rows={1}
            />
            <Button type="submit" size="icon" className="shrink-0 h-11 w-11" disabled={!newMessage.trim() || postMutation.isPending}>
              {postMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : messages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No messages yet. Be the first to post!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages
            .filter((msg) => !msg.parent_id) // Only show top-level messages
            .map((msg) => {
              const replies = messages.filter((m) => m.parent_id === msg.id);
              return (
                <div key={msg.id} className="space-y-2">
                  <Card className={msg.pinned ? "border-secondary/40 bg-secondary/5" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            msg.authorRole === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary/10 text-secondary"
                          }`}>
                            {msg.authorName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{msg.authorName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(parseISO(msg.created_at), "EEE d MMM, h:mma")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {msg.authorRole === "admin" && (
                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 gap-0.5">
                              <Megaphone className="h-2.5 w-2.5" /> Announcement
                            </Badge>
                          )}
                          {msg.pinned && <Pin className="h-3.5 w-3.5 text-secondary" />}
                        </div>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground gap-1"
                          onClick={() => setReplyTo(msg.id)}
                        >
                          <Reply className="h-3 w-3" /> Reply
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1"
                              onClick={() => pinMutation.mutate({ id: msg.id, pinned: !msg.pinned })}>
                              <Pin className="h-3 w-3" /> {msg.pinned ? "Unpin" : "Pin"}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1"
                              onClick={() => deleteMutation.mutate(msg.id)}>
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Render replies */}
                  {replies.map((reply) => (
                    <Card key={reply.id} className="ml-8 border-l-2 border-muted">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              reply.authorRole === "admin"
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary/10 text-secondary"
                            }`}>
                              {reply.authorName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{reply.authorName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(parseISO(reply.created_at), "EEE d MMM, h:mma")}
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{reply.content}</p>
                        <div className="flex gap-2 mt-2">
                          {/* Replies always target the top-level message to enforce 1-level nesting */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-muted-foreground gap-1"
                            onClick={() => setReplyTo(reply.parent_id ?? reply.id)}
                          >
                            <Reply className="h-3 w-3" /> Reply
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive gap-1"
                              onClick={() => deleteMutation.mutate(reply.id)}>
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
