const generateCredentials = (name) => {
  const username = `${name.toLowerCase().replace(/\s+/g, "")}${Math.floor(
    Math.random() * 1000
  )}`;
  const password = Math.random().toString(36).slice(-8);

  return { username, password };
};

export default generateCredentials;
