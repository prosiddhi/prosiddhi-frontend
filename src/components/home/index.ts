// ⚠️ Nothing imports this barrel — every consumer imports the file directly.
// Kept because it costs nothing, but do not assume a component is live just
// because it is exported here: LanguageModal was dead for months and this line
// was the only thing referencing it (TD-46).
export { Header } from './Header'
export { HeroSection } from './HeroSection'
export { GetStartedSection } from './GetStartedSection'
