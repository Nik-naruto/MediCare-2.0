export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePhone = (phone) => {
  const re = /^[6-9]\d{9}$/;
  return re.test(String(phone));
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && String(value).trim() !== '';
};
