import React, { useState, useEffect } from 'react';
import { FolderOpen, X, Save, FileText, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const TemplateManager = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onSaveTemplate,
  templateContent,
  availableVariables
}) => {
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load templates from localStorage on component mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem('savedTemplates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    }
  }, []);

  // Save templates to localStorage whenever they change
  useEffect(() => {
    if (templates.length > 0) {
      localStorage.setItem('savedTemplates', JSON.stringify(templates));
    }
  }, [templates]);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: 'Nama template diperlukan',
        description: 'Silakan beri nama template Anda',
        variant: 'destructive'
      });
      return;
    }

    if (!templateContent) {
      toast({
        title: 'Tidak ada konten template',
        description: 'Tidak ada konten template yang akan disimpan',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      const newTemplate = {
        id: Date.now().toString(),
        name: templateName,
        description: templateDescription,
        content: templateContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      
      toast({
        title: 'Template berhasil disimpan',
        description: `Template "${templateName}" telah disimpan`,
        variant: 'default'
      });

      // Reset form
      setTemplateName('');
      setTemplateDescription('');
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Gagal menyimpan template',
        description: 'Terjadi kesalahan saat menyimpan template',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = (templateId, e) => {
    e.stopPropagation();
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    
    toast({
      title: 'Template dihapus',
      description: 'Template telah dihapus',
      variant: 'default'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Template Surat</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Template List */}
          <div className="border-r border-slate-200 pr-4 overflow-y-auto">
            <h3 className="font-medium text-slate-800 mb-3">Template Tersimpan</h3>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Belum ada template yang disimpan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => onSelectTemplate(template)}
                    className="p-3 border rounded-md hover:bg-slate-50 cursor-pointer transition-colors relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-slate-800">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          Diperbarui: {new Date(template.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteTemplate(template.id, e)}
                        className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus template"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Form */}
          <div className="md:col-span-2 overflow-y-auto">
            <h3 className="font-medium text-slate-800 mb-3">
              {templateContent ? 'Simpan Template' : 'Pilih atau Buat Template'}
            </h3>
            
            {templateContent ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Nama Template</Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Contoh: Surat Keterangan Cuti Tahunan"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-description">Deskripsi (opsional)</Label>
                  <Input
                    id="template-description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Contoh: Template untuk cuti tahunan pegawai"
                    className="mt-1"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-md">
                  <p className="text-sm font-medium text-slate-700 mb-2">Variabel yang Tersedia:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(availableVariables).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <code className="text-xs bg-slate-200 px-2 py-1 rounded">{`{{${key}}}`}</code>
                        <span className="text-xs text-slate-500 truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p className="mb-4">Pilih template yang tersedia atau unggah dokumen baru untuk membuat template.</p>
                <p className="text-sm text-slate-400">Template yang disimpan akan muncul di daftar sebelah kiri.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          {templateContent && (
            <Button 
              onClick={handleSaveTemplate}
              disabled={!templateName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Template
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateManager;
