import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockMessages } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pin, Send, Megaphone, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const MessagesPage = () => {
  const { user, isAdmin } = useAuth();
  const [newMessage, setNewMessage] = useState("");

  if (!user) return null;

  const sortedMessages = [...mockMessages].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp.localeCompare(a.timestamp);
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Messages</h1>

      <Card>
        <CardContent className="p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setNewMessage("");
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
            <Button type="submit" size="icon" className="shrink-0 h-11 w-11" disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sortedMessages.map((msg) => (
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
                      {format(parseISO(msg.timestamp), "EEE d MMM, h:mma")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {msg.isAnnouncement && (
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
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1">
                    <Pin className="h-3 w-3" /> {msg.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1">
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MessagesPage;
