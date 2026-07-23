const axios = require("axios");
async function run() {
  try {
    const res = await axios.post("http://localhost:10000/api/v1/orgs/my-org/members", {
      email: "test_cyclic@example.com",
      role: "member"
    });
    console.log(res.data);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run();
