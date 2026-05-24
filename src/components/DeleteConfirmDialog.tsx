import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isPending?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "آرڈر ختم کریں؟",
  description = "کیا آپ واقعی اسے ڈیلیٹ کرنا چاہتے ہیں؟ یہ عمل واپس نہیں لیا جا سکتا۔",
  isPending = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[340px] rounded-2xl p-6 overflow-hidden">
        <DialogHeader className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <DialogTitle className="urdu-text text-xl font-bold text-center">{title}</DialogTitle>
          <DialogDescription className="urdu-text text-center text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 mt-4">
          <Button 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={isPending}
            className="w-full h-11 rounded-xl font-bold gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span className="urdu-text">جی ہاں، ڈیلیٹ کریں</span>
          </Button>
          <Button 
            variant="ghost" 
            onClick={onClose}
            disabled={isPending}
            className="w-full h-11 rounded-xl font-bold"
          >
            <span className="urdu-text">منسوخ کریں</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
