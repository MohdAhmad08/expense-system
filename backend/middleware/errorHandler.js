const errorHandler = (err, req, res, next) => {
  console.error('[Global Error Logger]:', err);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    message: err.message || 'An unexpected server error occurred.',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler;
