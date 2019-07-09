export function uid(prefix = 'comp') {
	return (
		prefix +
		'-' +
		Math.random()
			.toString(36)
			.substring(2, 16)
	);
}

// small helper to handle async/await errors without having to wrap it on try/catch;
// https://blog.grossman.io/how-to-write-async-await-without-try-catch-blocks-in-javascript/

export function to(promise) {
	return promise
		.then(data => {
			return [null, data];
		})
		.catch(err => [err]);
}
