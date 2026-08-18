import React from 'react';
import { InvoiceModal } from './InvoiceModal';
import { Sale } from '../../types';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: 'A4' | 'TICKET';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = (props) => {
  return <InvoiceModal {...props} />;
};
