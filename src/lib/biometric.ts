export async function isBiometricSupported(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
}

export async function registerBiometric(userId: string, email: string): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Kard', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' }, // RS256 fallback
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Solo biometrico nativo del dispositivo
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  }) as PublicKeyCredential | null

  if (!credential) throw new Error('cancelled')
  return btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
}

export async function verifyBiometric(credentialIdBase64: string): Promise<void> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const credentialIdBytes = Uint8Array.from(atob(credentialIdBase64), (c) => c.charCodeAt(0))

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: credentialIdBytes, type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000,
    },
  })

  if (!assertion) throw new Error('cancelled')
}
