module.exports = {
  NextResponse: {
    json: (body, init) => ({
      body: JSON.stringify(body),
      status: init?.status || 200,
      json: () => Promise.resolve(body),
    }),
  },
}
