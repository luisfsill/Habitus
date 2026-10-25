// Pin a DST-observing zone so date math is tested deterministically.
module.exports = () => {
  process.env.TZ = "America/New_York";
};
