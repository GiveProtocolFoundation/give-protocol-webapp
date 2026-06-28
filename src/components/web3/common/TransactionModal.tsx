import React from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface TransactionModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Modal container with a title bar, close button, and content area for Web3 flows.
 * @param props - Component props.
 * @param props.title - Heading rendered at the top of the modal.
 * @param props.onClose - Handler invoked when the close button is clicked.
 * @param props.children - Modal body content.
 * @returns The modal element.
 */
export const TransactionModal: React.FC<TransactionModalProps> = ({
  title,
  onClose,
  children,
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
      <Card className="w-full max-w-md relative shadow-2xl rounded-2xl animate-slideIn my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors z-10 bg-white/80 backdrop-blur-sm rounded-full p-1 hover:bg-white"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="p-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pr-8">
            {title}
          </h2>
          {children}
        </div>
      </Card>
    </div>
  );
};
