import { 
  User, Car, FileText, Briefcase, 
  Upload, Plus, Paperclip, X, MapPin 
} from "lucide-react";

interface UploadAreaProps {
  clienteDados?: {
    nome: string;
    documento: string;
    telefone: string;
  };
  documentos: any;
  setDocumentos: (docs: any) => void;
  onSingleUpload?: (tipo: string, file: File) => void;
}

const UploadArea = ({ clienteDados, documentos, setDocumentos, onSingleUpload }: UploadAreaProps) => {
  
  const tiposDocs = [
    { id: 'pessoal', label: 'Doc. Pessoal (RG/CNH)', icon: <User size={14}/> },
    { id: 'residencia', label: 'Comprovante Residência', icon: <MapPin size={14}/> },
    { id: 'veiculo', label: 'Documento do Veículo', icon: <Car size={14}/> },
    { id: 'apolice', label: 'Contrato de Apólice', icon: <FileText size={14}/> },
    { id: 'social', label: 'Contrato Social', icon: <Briefcase size={14}/> }
  ];

  return (
    <div className="space-y-4 text-left">
      {/* Dados do Cliente - Aparece apenas no acompanhamento */}
      {clienteDados && (
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Identificação do Cliente</p>
          <h4 className="text-[11px] font-black text-slate-800 uppercase leading-none">{clienteDados.nome}</h4>
          <div className="flex gap-3 mt-2">
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{clienteDados.documento}</span>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{clienteDados.telefone}</span>
          </div>
        </div>
      )}

      {/* Grid de Uploads */}
      <div className="bg-slate-50/50 p-5 rounded-[2rem] border-2 border-dashed border-slate-200">
        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <FileText size={14}/> Documentação do Cliente
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {tiposDocs.map((doc) => (
            <label key={doc.id} className="group relative flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-400 cursor-pointer transition-all shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="text-blue-500 group-hover:scale-110 transition-transform">{doc.icon}</div>
                <span className="text-[9px] font-bold text-slate-500 uppercase truncate">
                  {documentos[doc.id] ? documentos[doc.id].name : doc.label}
                </span>
              </div>
              <Upload size={14} className={documentos[doc.id] ? "text-green-500" : "text-slate-300"} />
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    if (onSingleUpload) {
                      onSingleUpload(doc.id, file);
                    } else {
                      setDocumentos({ ...documentos, [doc.id]: file });
                    }
                  }
                }} 
              />
            </label>
          ))}
        </div>

        {/* Seção de Outros Arquivos */}
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
            <Paperclip size={12}/> Documentos Adicionais
          </p>
          
          {documentos.outros?.map((file: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-[9px] font-bold text-blue-700">
              <span className="truncate">{file.name}</span>
              <button 
                type="button" 
                onClick={() => setDocumentos({ ...documentos, outros: documentos.outros.filter((_: any, i: number) => i !== idx) })}
                className="text-blue-400 hover:text-red-500"
              >
                <X size={14}/>
              </button>
            </div>
          ))}

          <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black text-blue-600 hover:bg-blue-50 transition-all cursor-pointer uppercase">
            <Plus size={14}/> Anexar outro documento
            <input 
              type="file" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (onSingleUpload) {
                    onSingleUpload('OUTROS', file);
                  } else {
                    setDocumentos({ ...documentos, outros: [...(documentos.outros || []), file] });
                  }
                }
              }} 
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export { UploadArea };