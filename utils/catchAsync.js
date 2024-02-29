module.exports = (fn) => {
  // This function takes in an asynchronous function as an argument
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
