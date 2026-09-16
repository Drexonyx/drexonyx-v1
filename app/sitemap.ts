import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.drexonyx.com';
  const now = new Date();

  return [
    { url: `${base}/`,              lastModified: now, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${base}/services`,      lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/how-it-works`,  lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/portfolio`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/pricing`,       lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/about`,         lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/start-project`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
