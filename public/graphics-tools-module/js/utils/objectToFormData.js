export default function objectToFormData(obj, formData = new FormData(), parentKey = '') {
  for (const [key, value] of Object.entries(obj)) {
    const formKey = parentKey ? `${parentKey}[${key}]` : key;

    if (value && typeof value === 'object' && !(value instanceof File)) {
      objectToFormData(value, formData, formKey);
    } else {
      formData.append(formKey, value);
    }
  }

  return formData;
}