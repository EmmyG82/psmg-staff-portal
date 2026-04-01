import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pin, Send, Megaphone, Trash2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const MessagesPage = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

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

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        author_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setNewMessage("");
    },
    onError: () => toast.error("Failed to post message"),
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
              placeholder={isAdmin ? "Post an announcement..." : "Write a message..."}
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
          {messages.map((msg) => (
            <Card key={msg.id} className={msg.pinned ? "border-secondary/40 bg-secondary/5" : ""}>
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
                {isAdmin && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1"
                      onClick={() => pinMutation.mutate({ id: msg.id, pinned: !msg.pinned })}>
                      <Pin className="h-3 w-3" /> {msg.pinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1"
                      onClick={() => deleteMutation.mutate(msg.id)}>
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
