const axios = require("axios");
const net = require("net");
const ping = require("ping");

const REQUEST_TIMEOUT_MS = 5000;
const SOCKET_TIMEOUT_MS = 2000;

async function checkWebsiteStatus(serverUrl) {
  try {
    const response = await axios.get(serverUrl, {
      timeout: REQUEST_TIMEOUT_MS,
    });
    return {
      status: response.status,
      data: response.data,
      statusDescription: "Online",
    };
  } catch (error) {
    let statusDescription = "Offline"; // Default value
    if (error.response) {
      switch (error.response.status) {
        case 400:
          statusDescription = "Bad Request";
          break;
        case 401:
          statusDescription = "Unauthorized";
          break;
        case 403:
          statusDescription = "Forbidden";
          break;
        case 404:
          statusDescription = "Not Found";
          break;
        case 500:
          statusDescription = "Internal Server Error";
          break;
        case 502:
          statusDescription = "Bad Gateway";
          break;
        case 503:
          statusDescription = "Service Unavailable";
          break;
        default:
          statusDescription = "Offline";
      }
    }
    return {
      status: error.response ? error.response.status : "unknown",
      data: error.message,
      statusDescription: statusDescription,
    };
  }
}

async function checkGameServerStatus(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const finish = (status) => {
      if (resolved) {
        return;
      }
      resolved = true;
      socket.destroy();
      resolve({ status });
    };

    socket.setTimeout(SOCKET_TIMEOUT_MS);
    socket.once("connect", () => finish(200));
    socket.once("timeout", () => finish("timeout"));
    socket.once("error", () => finish("error"));
    socket.connect(port, host);
  });
}

function extractHostname(server) {
  let hostname;
  try {
    const parsedUrl = new URL(server);
    hostname = parsedUrl.hostname;
    // console.log(hostname)
  } catch (err) {
    hostname = server;
    // console.error(err);
  }
  return hostname;
}

async function getPing(server, type, port) {
  try {
    const hostname = extractHostname(server);
    if (type === "website") {
      const res = await ping.promise.probe(hostname, {
        timeout: SOCKET_TIMEOUT_MS / 1000,
      });
      return res.time === "unknown" ? "N/A" : res.time.toFixed(0);
    } else if (type === "port") {
      return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        let resolved = false;

        const finish = (value) => {
          if (resolved) {
            return;
          }
          resolved = true;
          socket.destroy();
          resolve(value);
        };

        socket.setTimeout(SOCKET_TIMEOUT_MS);
        socket.once("connect", () => finish(Date.now() - start));
        socket.once("timeout", () => finish("N/A"));
        socket.once("error", () => finish("N/A"));

        socket.connect(port, hostname);
      });
    }
  } catch (error) {
    console.error(`Failed to get ping for ${server}:`, error);
    return "N/A";
  }
}

module.exports = {
  checkWebsiteStatus,
  checkGameServerStatus,
  getPing,
};
