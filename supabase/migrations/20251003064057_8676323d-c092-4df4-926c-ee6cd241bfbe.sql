-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  featured_image text,
  content text NOT NULL,
  excerpt text,
  category text,
  tags text[],
  author_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Anyone can view
CREATE POLICY "Anyone can view blog posts"
ON public.blog_posts
FOR SELECT
USING (true);

-- Admins can do everything
CREATE POLICY "Admins can create blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blog posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blog posts"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Employers can manage their own posts
CREATE POLICY "Employers can create their own blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'employer'::app_role) AND auth.uid() = author_id);

CREATE POLICY "Employers can update their own blog posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'employer'::app_role) AND auth.uid() = author_id);

CREATE POLICY "Employers can delete their own blog posts"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'employer'::app_role) AND auth.uid() = author_id);

-- Add trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();