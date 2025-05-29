const fireEvent = (handlers, data) => {
  handlers.forEach(f => f(data));
};

export default fireEvent;
