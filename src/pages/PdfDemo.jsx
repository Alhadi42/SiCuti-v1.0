import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import PdfFormFiller from '@/components/PdfFormFiller';
import { getTemplateFields, formatFormDataForPdf, getTemplateUrl } from '@/utils/pdfTemplates';

const PdfDemo = () => {
  const { templateId = 'surat_keterangan' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get the fields needed for this template
  const templateFields = getTemplateFields(templateId);
  
  // Initialize form state
  const [formData, setFormData] = useState(() => {
    const initialState = {};
    templateFields.forEach(field => {
      initialState[field.name] = '';
    });
    return initialState;
  });
  
  // Set some default values for demo purposes
  useEffect(() => {
    if (templateId === 'surat_keterangan') {
      setFormData(prev => ({
        ...prev,
        nama: 'John Doe',
        nip: '198709012023012001',
        jabatan: 'Staf',
        unit_kerja: 'Fakultas Teknik',
        jenis_cuti: 'Cuti Tahunan',
        lama_cuti: '5',
        tanggal_mulai: format(new Date(), 'yyyy-MM-dd'),
        tanggal_surat: format(new Date(), 'yyyy-MM-dd'),
        nomor_surat: `SK/${format(new Date(), 'yyyy/MM')}/001`,
      }));
    }
  }, [templateId]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, you would save the form data here
    toast({
      title: "Form submitted",
      description: "The form data has been processed.",
    });
  };
  
  const handleSavePdf = (pdfUrl) => {
    // In a real app, you would save the PDF URL to your database
    toast({
      title: "PDF saved",
      description: "The PDF has been saved successfully.",
    });
  };
  
  const handleDownloadPdf = () => {
    toast({
      title: "Download started",
      description: "Your download should begin shortly.",
    });
  };
  
  // Format the form data for the PDF
  const pdfFormData = formatFormDataForPdf(formData, templateId);
  const templateUrl = getTemplateUrl(templateId);
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">PDF Form Filler</h1>
        <p className="text-slate-500">
          Fill out the form to generate a PDF with the provided information.
        </p>
      </div>
      
      <Tabs defaultValue="form" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="form">Form</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>Form Data</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templateFields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      
                      {field.type === 'select' ? (
                        <Select 
                          value={formData[field.name] || ''} 
                          onValueChange={(value) => handleSelectChange(field.name, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'textarea' ? (
                        <Textarea
                          id={field.name}
                          name={field.name}
                          value={formData[field.name] || ''}
                          onChange={handleInputChange}
                          required={field.required}
                        />
                      ) : (
                        <Input
                          type={field.type}
                          id={field.name}
                          name={field.name}
                          value={formData[field.name] || ''}
                          onChange={handleInputChange}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Back
                  </Button>
                  <Button type="submit">
                    Save Form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>PDF Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <PdfFormFiller
                  templateUrl={templateUrl}
                  formData={pdfFormData}
                  onSave={handleSavePdf}
                  onDownload={handleDownloadPdf}
                  fileName={`surat_keterangan_${formData.nip || 'document'}.pdf`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PdfDemo;
