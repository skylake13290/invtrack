export default {
  async fetch(request, env, ctx) {
    const backendURL = "mybackend.com"; // Your hidden backend
    
    const url = new URL(request.url);
    
    // Replace the hostname with your backend hostname
    const targetUrl = backendURL + url.pathname + url.search;

    // Create a new request to the backend
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });

    // Fetch the content from your backend
    const response = await fetch(modifiedRequest);

    // Return the response back to the user
    return response;
  },
};
