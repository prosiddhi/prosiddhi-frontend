// The seeker's home State + City at registration. Both are required, and the BE
// takes only the city (`cityId`): the state is derived from it, so a city can
// never be stored under the wrong state.
//
// Pure on purpose — scripts/verify-register-city.mjs runs this file as it is.

export type HomeCityProblem = 'stateRequired' | 'cityRequired'

/**
 * What is missing, or null when both are chosen.
 *
 * `stateCode` is the state the person is browsing (null = none picked); `cityId` is the
 * chosen city. A city always sits in a state, so having one means the state is chosen
 * too, whatever `stateCode` says: "Use my location" fills in a city without the picker
 * ever reporting a state code.
 */
export function homeCityProblem(
  stateCode: number | null | undefined,
  cityId: string | null | undefined
): HomeCityProblem | null {
  if (cityId) return null
  return stateCode == null ? 'stateRequired' : 'cityRequired'
}
