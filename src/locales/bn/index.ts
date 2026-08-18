// Barrel for the `bn` locale — generated, but safe to edit by hand.
//
// Each locale gets one module so `import('@/locales/bn')` produces exactly one
// chunk. Without this, i18n/config.ts imported all 10 locales eagerly and every user
// downloaded ~1.2 MB of translations they would never read — a real cost on the cheap
// Android phones this product targets.
import common from './common.json'
import auth from './auth.json'
import employerRegister from './employerRegister.json'
import seeker from './seeker.json'
import employer from './employer.json'
import chat from './chat.json'
import profile from './profile.json'
import taxonomy from './taxonomy.json'
import legal from './legal.json'

const bnResources = {
  common,
  auth,
  employerRegister,
  seeker,
  employer,
  chat,
  profile,
  taxonomy,
  legal,
} as const

export default bnResources
