const extractErrorMessage = (error: any): string | null => {
  if (!error) {
    return null;
  }

  if (!error.message && !error.data.message) {
    return null;
  }

  if (error.message) {
    return error.message.toString();
  }

  if (error.message.data) {
    return error.message.data.toString();
  }

  return null;
};

export default extractErrorMessage;
