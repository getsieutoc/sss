const alphabets = 'abcdefghijklmnopqrstuvwxyz';
const numeric = '0123456789';
const special = '!@#$%^&*()[]{}_-=+';

type CreateCodeOptions = {
  size: number;
  hasNumber?: boolean;
  hasSpecial?: boolean;
  onlyLowerCase?: boolean;
  onlyUpperCase?: boolean;
};

export const randomize = ({
  size = 16,
  hasNumber = true,
  hasSpecial = false,
  onlyLowerCase = false,
  onlyUpperCase = false,
}: CreateCodeOptions) => {
  const upperCaseChars = alphabets.toUpperCase();

  let chars = alphabets + upperCaseChars;

  if (onlyLowerCase) {
    chars = alphabets;
  }

  if (onlyUpperCase) {
    chars = upperCaseChars;
  }

  if (hasNumber) {
    chars += numeric;
  }

  if (hasSpecial) {
    chars += special;
  }

  let code = '';
  for (let i = 0; i < size; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
};
