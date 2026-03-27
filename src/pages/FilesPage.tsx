import { useAuth } from "@/contexts/AuthContext";
import { mockFiles } from "@/data/mockData";
import { MOCK_USERS } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Image, Download, Upload, Folder } from "lucide-react";
import { format, parseISO } from "date-fns";

const fileIcon = (type: string) => {
  if (type === "image") return <Image className="h-5 w-5 text-secondary" />;
  return <FileText className="h-5 w-5 text-primary" />;
};

const FilesPage = () => {
  const { user, isAdmin } = useAuth();

  if (!user) return null;

  if (isAdmin) {
    const staffMembers = MOCK_USERS.filter((u) => u.role === "staff");
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Staff Files</h1>
          <Button size="sm" className="gap-1">
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>
        {staffMembers.map((staff) => {
          const files = mockFiles.filter((f) => f.staffId === staff.id);
          return (
            <Card key={staff.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{staff.name}</p>
                  <span className="text-xs text-muted-foreground">({files.length} files)</span>
                </div>
                {files.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No files uploaded.</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        {fileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground">{file.size} · {format(parseISO(file.uploadedAt), "d MMM yyyy")}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Staff view
  const myFiles = mockFiles.filter((f) => f.staffId === user.id);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">My Files</h1>
      {myFiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No files available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {myFiles.map((file) => (
            <Card key={file.id}>
              <CardContent className="flex items-center gap-3 p-3">
                {fileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{file.size} · {format(parseISO(file.uploadedAt), "d MMM yyyy")}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <Download className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilesPage;
