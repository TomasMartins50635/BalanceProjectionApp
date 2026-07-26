import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onExportCsv: () => void;
  onPrint?: () => void;
  /** "default": label esconde-se em mobile (para cabeçalhos amplos). "compact": botão mais baixo, label sempre visível (para caber em linhas de filtros já ocupadas). */
  variant?: 'default' | 'compact';
  className?: string;
}

export function ExportCsvButton({ onClick, variant = 'default', className }: { onClick: () => void; variant?: 'default' | 'compact'; className?: string }) {
  if (variant === 'compact') {
    return (
      <Button variant="outline" size="sm" className={`h-7 text-xs shrink-0 ${className ?? ''}`} onClick={onClick}>
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Exportar CSV
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" className={className} onClick={onClick}>
      <Download className="w-3.5 h-3.5 md:mr-1.5" /><span className="hidden md:inline">Exportar CSV</span>
    </Button>
  );
}

export function PrintButton({ onClick, variant = 'default', className }: { onClick?: () => void; variant?: 'default' | 'compact'; className?: string }) {
  const handleClick = onClick ?? (() => window.print());
  if (variant === 'compact') {
    return (
      <Button variant="outline" size="sm" className={`h-7 text-xs shrink-0 ${className ?? ''}`} onClick={handleClick}>
        <Printer className="w-3.5 h-3.5 mr-1.5" />
        Imprimir
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" className={className} onClick={handleClick}>
      <Printer className="w-3.5 h-3.5 md:mr-1.5" /><span className="hidden md:inline">Imprimir</span>
    </Button>
  );
}

/** Par de botões Exportar CSV + Imprimir, lado a lado. */
export function ReportActionButtons({ onExportCsv, onPrint, variant = 'default', className }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <ExportCsvButton onClick={onExportCsv} variant={variant} />
      <PrintButton onClick={onPrint} variant={variant} />
    </div>
  );
}
