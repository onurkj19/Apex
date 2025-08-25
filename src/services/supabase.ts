import supabase from '@/lib/supabase';

export interface SupabaseProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  discount: number;
  image_url: string | null;
  image_path: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface SupabaseProject {
  id: string;
  title: string;
  description: string;
  location: string;
  completed_date: string;
  client?: string | null;
  category?: string | null;
  duration?: string | null;
  created_at: string;
}

export interface SupabaseProjectImage {
  id: string;
  project_id: string;
  image_url: string;
  image_path: string;
  created_at: string;
}

export const supabaseAPI = {
  // Public fetch
  getPublicProducts: async (): Promise<SupabaseProduct[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getPublicProjects: async (): Promise<(SupabaseProject & { images: SupabaseProjectImage[] })[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, project_images(*)')
      .order('completed_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((p: any) => ({ ...p, images: p.project_images || [] }));
  },

  // Admin: Products
  addProduct: async (fields: {
    title: string;
    description: string;
    price: number;
    discount?: number;
    imageFile?: File | null;
  }): Promise<SupabaseProduct> => {
    let image_url: string | null = null;
    let image_path: string | null = null;

    if (fields.imageFile) {
      const fileName = `${Date.now()}-${fields.imageFile.name}`;
      const filePath = `products/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, fields.imageFile, { upsert: false });
      if (uploadError) throw uploadError;
      image_path = uploadData?.path || filePath;
      const { data: publicUrl } = supabase.storage.from('products').getPublicUrl(image_path);
      image_url = publicUrl.publicUrl;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        title: fields.title,
        description: fields.description,
        price: fields.price,
        discount: fields.discount ?? 0,
        image_url,
        image_path,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as SupabaseProduct;
  },

  updateProduct: async (id: string, fields: {
    title: string;
    description: string;
    price: number;
    discount?: number;
    imageFile?: File | null;
  }): Promise<SupabaseProduct> => {
    let image_url: string | null | undefined = undefined;
    let image_path: string | null | undefined = undefined;

    if (fields.imageFile) {
      const fileName = `${Date.now()}-${fields.imageFile.name}`;
      const filePath = `products/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, fields.imageFile, { upsert: false });
      if (uploadError) throw uploadError;
      image_path = uploadData?.path || filePath;
      const { data: publicUrl } = supabase.storage.from('products').getPublicUrl(image_path);
      image_url = publicUrl.publicUrl;
    }

    const updates: any = {
      title: fields.title,
      description: fields.description,
      price: fields.price,
      discount: fields.discount ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (image_url !== undefined) {
      updates.image_url = image_url;
      updates.image_path = image_path || null;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as SupabaseProduct;
  },

  deleteProduct: async (id: string): Promise<void> => {
    // Fetch to get image_path
    const { data: product } = await supabase
      .from('products')
      .select('image_path')
      .eq('id', id)
      .single();

    if (product?.image_path) {
      await supabase.storage.from('products').remove([product.image_path]);
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  // Admin: Projects
  addProject: async (fields: {
    title: string;
    description: string;
    location: string;
    completed_date: string;
    client?: string;
    category?: string;
    duration?: string;
    images: File[];
  }): Promise<{ project: SupabaseProject; images: SupabaseProjectImage[] }> => {
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        title: fields.title,
        description: fields.description,
        location: fields.location,
        completed_date: fields.completed_date,
        client: fields.client || null,
        category: fields.category || null,
        duration: fields.duration || null,
      })
      .select('*')
      .single();
    if (error) throw error;

    const images: SupabaseProjectImage[] = [];
    for (const img of fields.images) {
      const fileName = `${project.id}/${Date.now()}-${img.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('projects')
        .upload(fileName, img, { upsert: false });
      if (uploadError) throw uploadError;
      const image_path = uploadData?.path || fileName;
      const { data: publicUrl } = supabase.storage.from('projects').getPublicUrl(image_path);
      const image_url = publicUrl.publicUrl;

      const { data: imageRow, error: imageError } = await supabase
        .from('project_images')
        .insert({ project_id: project.id, image_url, image_path })
        .select('*')
        .single();
      if (imageError) throw imageError;
      images.push(imageRow as SupabaseProjectImage);
    }

    return { project: project as SupabaseProject, images };
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const { data: imgs } = await supabase
      .from('project_images')
      .select('image_path')
      .eq('project_id', projectId);
    const paths = (imgs || []).map((i) => i.image_path);
    if (paths.length) {
      await supabase.storage.from('projects').remove(paths);
    }
    await supabase.from('project_images').delete().eq('project_id', projectId);
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) throw error;
  },
};

export default supabaseAPI;


