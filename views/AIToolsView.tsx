import React, { useState } from 'react';
import { Card, Button, Input, Select, FileUpload } from '../components/UI';
import { generateProImage, generateVeoVideo, ensureApiKey } from '../services/geminiService';

export const AIToolsView: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'video' | 'image'>('video');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Veo State
  const [veoPrompt, setVeoPrompt] = useState('');
  const [veoImage, setVeoImage] = useState<string | null>(null);
  const [veoResult, setVeoResult] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  // Image Gen State
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imgResult, setImgResult] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVeoImage(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleGenerateVideo = async () => {
    if (!veoImage) {
      setError("Please upload an image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setVeoResult(null);

    try {
      const hasKey = await ensureApiKey();
      if (!hasKey) {
        throw new Error("API Key selection failed or cancelled.");
      }

      const videoUrl = await generateVeoVideo(veoPrompt, veoImage, aspectRatio);
      setVeoResult(videoUrl);
    } catch (err: any) {
      setError(err.message || "Failed to generate video");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imgPrompt) {
      setError("Please enter a prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setImgResult(null);

    try {
       const hasKey = await ensureApiKey();
       if (!hasKey) {
         throw new Error("API Key selection failed or cancelled.");
       }

       const imageUrl = await generateProImage(imgPrompt, imgSize);
       setImgResult(imageUrl);
    } catch (err: any) {
      setError(err.message || "Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex space-x-4 border-b border-gray-200 pb-2">
        <button 
          onClick={() => setActiveTool('video')}
          className={`pb-2 px-1 ${activeTool === 'video' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <span>🎥</span> Veo Video Animation
          </div>
        </button>
        <button 
          onClick={() => setActiveTool('image')}
          className={`pb-2 px-1 ${activeTool === 'image' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <span>🎨</span> Nano Banana Pro Image
          </div>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {activeTool === 'video' && (
        <Card title="Animate Images with Veo">
          <p className="text-gray-500 text-sm mb-4">Upload a photo to transform it into a high-quality video using Google Veo.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <FileUpload 
                 label="Source Image"
                 accept="image/*"
                 onChange={handleImageUpload}
               />
               
               {veoImage && (
                 <div className="relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img src={veoImage} alt="Preview" className="h-full w-full object-contain" />
                 </div>
               )}

               <Input 
                 label="Prompt (Optional)"
                 placeholder="Describe the motion, e.g., 'A cinematic pan shot', 'The leaves are blowing in the wind'"
                 value={veoPrompt}
                 onChange={(e) => setVeoPrompt(e.target.value)}
               />

               <Select
                 label="Aspect Ratio"
                 options={[
                   { value: '16:9', label: 'Landscape (16:9)' },
                   { value: '9:16', label: 'Portrait (9:16)' }
                 ]}
                 value={aspectRatio}
                 onChange={(e) => setAspectRatio(e.target.value as any)}
               />

               <Button 
                 onClick={handleGenerateVideo} 
                 disabled={isLoading || !veoImage}
                 className="w-full"
               >
                 {isLoading ? 'Generating Video (this may take a minute)...' : 'Generate Video'}
               </Button>
            </div>

            <div className="bg-gray-900 rounded-lg flex items-center justify-center min-h-[300px]">
              {veoResult ? (
                <video controls className="w-full h-full rounded-lg" src={veoResult} />
              ) : (
                <div className="text-gray-500 text-center p-4">
                  {isLoading ? (
                    <div className="animate-pulse">Processing video...</div>
                  ) : (
                    "Generated video will appear here"
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTool === 'image' && (
        <Card title="Generate High-Quality Images">
           <div className="space-y-4">
             <Input
               label="Prompt"
               placeholder="Describe the image you want to create..."
               value={imgPrompt}
               onChange={(e) => setImgPrompt(e.target.value)}
             />

             <Select 
               label="Image Resolution"
               options={[
                 { value: '1K', label: '1K (Standard)' },
                 { value: '2K', label: '2K (High Def)' },
                 { value: '4K', label: '4K (Ultra HD)' }
               ]}
               value={imgSize}
               onChange={(e) => setImgSize(e.target.value as any)}
             />

             <Button 
                onClick={handleGenerateImage} 
                disabled={isLoading}
              >
                {isLoading ? 'Generating...' : 'Generate Image'}
              </Button>

              <div className="mt-6 border-t pt-6">
                {imgResult ? (
                  <div className="flex justify-center">
                    <img src={imgResult} alt="Generated" className="rounded-lg shadow-lg max-h-[500px]" />
                  </div>
                ) : (
                   <div className="h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                     {isLoading ? "Generating..." : "Image preview area"}
                   </div>
                )}
              </div>
           </div>
        </Card>
      )}
    </div>
  );
};
