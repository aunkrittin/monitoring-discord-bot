const axios = require("axios");
const net = require("net");
const ping = require("ping");

async function checkWebsiteStatus(serverUrl) {
  try {
    const response = await axios.get(serverUrl);
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
    socket.setTimeout(2000);
    socket.on("connect", () => {
      socket.destroy();
      resolve({ status: 200 });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ status: "timeout" });
    });
    socket.on("error", () => {
      resolve({ status: "error" });
    });
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
      const res = await ping.promise.probe(hostname);
      return res.time === "unknown" ? "N/A" : res.time.toFixed(0);
    } else if (type === "port") {
      return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on("connect", () => {
          const end = Date.now();
          socket.destroy();
          resolve(end - start);
        });

        socket.on("timeout", () => {
          socket.destroy();
          resolve("N/A");
        });

        socket.on("error", () => {
          resolve("N/A");
        });

        socket.connect(port, hostname);
      });
    }
  } catch (error) {
    console.error(`Failed to get ping for ${server}:`, error);
    return "N/A";
  }
}

async function updateInstatusComponent(
  componentId,
  newStatus,
  currentStatus,
  instatusApiUrl,
  instatusApiToken,
  instatusPageId
) {
  if (newStatus === currentStatus) {
    return; // No need to update if the status is the same
  }

  const url = `${instatusApiUrl}/v1/${instatusPageId}/components/${componentId}`;
  try {
    await axios.put(
      url,
      {
        status: newStatus,
        internalStatus: newStatus,
      },
      {
        headers: {
          Authorization: `Bearer ${instatusApiToken}`,
        },
      }
    );
    console.log(`Updated status of component ${componentId} to ${newStatus}`);
  } catch (error) {
    console.error(
      `Failed to update status of component ${componentId}:`,
      error
    );
  }
}

module.exports = {
  checkWebsiteStatus,
  checkGameServerStatus,
  getPing,
  updateInstatusComponent,
};
