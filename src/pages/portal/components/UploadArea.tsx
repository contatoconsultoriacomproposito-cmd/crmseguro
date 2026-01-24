import { 
  User, Car, FileText, Briefcase, 
  Upload, Plus, Paperclip, X, MapPin, CheckCircle2 
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
  documentosSalvos?: any[]; 
}

const UploadArea = ({ clienteDados, documentos, setDocumentos, onSingleUpload, documentosSalvos = [] }: UploadAreaProps) => {
  
  const tiposDocs = [
    { id: 'pessoal', dbTipo: 'RG/CNH', label: 'Doc. Pessoal (RG/CNH)', icon: <User size={14}/> },
    { id: 'residencia', dbTipo: 'RESIDENCIA', label: 'Comprovante Residência', icon: <MapPin size={14}/> },
    { id: 'veiculo', dbTipo: 'VEICULO', label: 'Documento do Veículo', icon: <Car size={14}/> },
    { id: 'apolice', dbTipo: 'APOLICE', label: 'Contrato de Apólice', icon: <FileText size={14}/> },
    { id: 'social', dbTipo: 'CONTRATO_SOCIAL', label: 'Contrato Social', icon: <Briefcase size={14}/> }
  ];

  /**
   * FUNÇÃO DE RASTREIO DEFINITIVA
   * Se após o F5 o console não imprimir "🟢 [BANCO]", 
   * a prop 'documentosSalvos' está vindo vazia do componente pai.
   */
  const checkStatus = (dbTipoEsperado: string, idLocal: string) => {
    // Normalização básica para evitar erros de comparação de string
    const noBanco = documentosSalvos.find(d => 
      d.tipo?.trim().toUpperCase() === dbTipoEsperado.trim().toUpperCase()
    );
    
    const noEstadoLocal = documentos[idLocal];

    return !!noBanco || !!noEstadoLocal;
  };

  return (
    <div className="space-y-4 text-left font-sans">
      {/* IDENTIFICAÇÃO DO CLIENTE */}
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

      {/* GRADE DE DOCUMENTOS PRINCIPAIS */}
      <div className="bg-slate-50/50 p-5 rounded-[2rem] border-2 border-dashed border-slate-200">
        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <FileText size={14}/> Documentação do Cliente
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {tiposDocs.map((doc) => {
            const enviado = checkStatus(doc.dbTipo, doc.id);
            
            return (
              <label 
                key={doc.id} 
                className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all shadow-sm cursor-pointer
                  ${enviado ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-blue-400'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`${enviado ? 'text-emerald-500' : 'text-blue-500'} group-hover:scale-110 transition-transform`}>
                    {enviado ? <CheckCircle2 size={14}/> : doc.icon}
                  </div>
                  <span className={`text-[9px] font-bold uppercase truncate ${enviado ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {documentos[doc.id] ? documentos[doc.id].name : doc.label}
                  </span>
                </div>
                
                {enviado ? (
                  <div className="bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 size={10} strokeWidth={3} />
                  </div>
                ) : (
                  <Upload size={14} className="text-slate-300" />
                )}

                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      console.log(`📤 Iniciando Upload Local: ${doc.dbTipo}`);
                      if (onSingleUpload) {
                        onSingleUpload(doc.dbTipo, file);
                      } else {
                        setDocumentos({ ...documentos, [doc.id]: file });
                      }
                    }
                  }} 
                />
              </label>
            );
          })}
        </div>

        {/* DOCUMENTOS ADICIONAIS */}
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <p className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
            <Paperclip size={12}/> Documentos Adicionais
          </p>
          
          {/* Vindo do Banco (Persistidos) */}
          {documentosSalvos.filter(d => d.tipo === 'OUTROS').map((file, idx) => (
            <div key={`db-${idx}`} className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-[9px] font-bold text-emerald-700">
              <span className="truncate flex items-center gap-2">
                <CheckCircle2 size={12}/> {file.nome_arquivo || 'Documento Adicional'}
              </span>
              <span className="text-[7px] uppercase font-black opacity-40 px-2">Salvo</span>
            </div>
          ))}

          {/* Estado Local (Upload em andamento) */}
          {documentos.outros?.map((file: any, idx: number) => (
            <div key={`local-${idx}`} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-[9px] font-bold text-blue-700">
              <span className="truncate">{file.name}</span>
              <button 
                type="button" 
                onClick={() => setDocumentos({ ...documentos,妝outros: documentos.outros.filter((_: any, i: number) => i !== idx) })}
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