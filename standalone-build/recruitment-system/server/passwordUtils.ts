// Password generation utility
export function generateSecurePassword(): string {
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)]; // At least 1 uppercase
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)]; // At least 1 lowercase
  password += numberChars[Math.floor(Math.random() * numberChars.length)]; // At least 1 number
  password += symbolChars[Math.floor(Math.random() * symbolChars.length)]; // At least 1 symbol
  
  // Fill remaining 5 characters randomly from all categories
  const allChars = lowercaseChars + uppercaseChars + numberChars + symbolChars;
  for (let i = 4; i < 9; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to randomize positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
}