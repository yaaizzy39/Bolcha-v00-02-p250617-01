import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Camera, Globe, Upload, RotateCcw } from 'lucide-react';

export function ProfileImageUpload() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  
  // Get interface language from user settings
  const interfaceLanguage = (user as any)?.interfaceLanguage || 'ja';


  // Get the current profile image to display
  const currentUser = user as any;
  const currentProfileImage = currentUser?.useCustomProfileImage 
    ? currentUser?.customProfileImageUrl 
    : currentUser?.profileImageUrl;

  const displayName = currentUser?.firstName && currentUser?.lastName 
    ? `${currentUser.firstName} ${currentUser.lastName}` 
    : currentUser?.email?.split('@')[0] || 'User';

  // Mutation to update profile image
  const updateProfileImageMutation = useMutation({
    mutationFn: async ({ imageUrl, useCustom }: { imageUrl: string; useCustom: boolean }) => {
      return await apiRequest('POST', '/api/user/profile-image', { imageUrl, useCustom });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile image updated",
        description: "Your profile image has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile image. Please try again.",
        variant: "destructive",
      });
    },
  });



  // Mutation to toggle between Google and custom image
  const toggleImageMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/user/toggle-profile-image');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile image switched",
        description: currentUser?.useCustomProfileImage 
          ? "Switched to Google profile image." 
          : "Switched to custom profile image.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to switch profile image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Convert file to base64 data URL for simple storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 1MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 400x400 to reduce size)
        const maxSize = 400;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress the image
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        updateProfileImageMutation.mutate({ imageUrl: compressedDataUrl, useCustom: true });
        setIsUploading(false);
      };
      
      img.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to process the image file.",
          variant: "destructive",
        });
        setIsUploading(false);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Error",
        description: "Failed to process the image.",
        variant: "destructive",
      });
    }
  };



  const handleToggleImage = () => {
    if (!currentUser?.customProfileImageUrl && !currentUser?.useCustomProfileImage) {
      toast({
        title: "No custom image",
        description: "Please upload a custom image first.",
        variant: "destructive",
      });
      return;
    }
    
    toggleImageMutation.mutate();
  };



  return (
    <div className="space-y-6">
      <div className="text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4">
          <AvatarImage 
            src={currentProfileImage} 
            alt={displayName}
            className="object-cover"
          />
          <AvatarFallback className="text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-lg font-medium">{displayName}</h3>
        <p className="text-sm text-muted-foreground">
          {currentUser?.useCustomProfileImage ? 'Custom Image' : 'Google Account Image'}
        </p>
      </div>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <Label className="text-sm font-medium">
            {interfaceLanguage === 'en' ? 'Upload Image File' : '画像ファイルをアップロード'}
          </Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || updateProfileImageMutation.isPending}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading 
                ? (interfaceLanguage === 'en' ? 'Uploading...' : 'アップロード中...') 
                : (interfaceLanguage === 'en' ? 'Choose File' : 'ファイルを選択')
              }
            </Button>
            <span className="text-xs text-muted-foreground">
              {interfaceLanguage === 'en' ? 'Max 1MB, JPG/PNG' : '最大1MB、JPG/PNG'}
            </span>
          </div>
        </div>



        {/* Toggle between Google and Custom */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {currentUser?.useCustomProfileImage ? (
              <Camera className="w-5 h-5 text-primary" />
            ) : (
              <Globe className="w-5 h-5 text-blue-500" />
            )}
            <div>
              <p className="font-medium">
                {currentUser?.useCustomProfileImage 
                  ? (interfaceLanguage === 'en' ? 'Custom Image' : 'カスタム画像')
                  : (interfaceLanguage === 'en' ? 'Google Account Image' : 'Googleアカウント画像')
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {currentUser?.useCustomProfileImage 
                  ? (interfaceLanguage === 'en' ? 'Using your uploaded image' : 'アップロードした画像を使用中')
                  : (interfaceLanguage === 'en' ? 'Using your Google profile picture' : 'Googleプロフィール画像を使用中')
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleImage}
              disabled={toggleImageMutation.isPending}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {interfaceLanguage === 'en' ? 'Switch' : '切り替え'}
            </Button>
          </div>
        </div>


      </div>
    </div>
  );
}