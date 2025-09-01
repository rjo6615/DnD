const subscribers = [];

export function notify(message, variant = 'danger') {
  subscribers.forEach((cb) => cb({ message, variant }));
}

export function subscribe(callback) {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  };
}
