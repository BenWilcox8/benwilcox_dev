export type ProjectTone = 'default' | 'math' | 'product' | 'research'

export type DateParts = {
  month: string
  year: number
}

export type ProjectLink = {
  label: string
  href: string
}

export type SubProject = {
  id: string
  title: string
  description: string
  imageAlt: string
  links: ProjectLink[]
}

export type ProjectVariantConfig = {
  tone: ProjectTone
  accentColor: string
  borderStyle?: 'solid' | 'dashed'
}

export type Project = {
  id: string
  title: string
  summary: string
  date: DateParts
  imageAlt: string
  primaryLink: ProjectLink
  secondaryLinks?: ProjectLink[]
  variant: ProjectVariantConfig
  subProjects?: SubProject[]
}

export type SocialLink = {
  label: string
  href: string
}

export type ProfileContent = {
  name: string
  role: string
  bio: string
  imageAlt: string
  socialLinks: SocialLink[]
}
