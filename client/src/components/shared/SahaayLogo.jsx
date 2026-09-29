import sahaayLogoSrc from "../../assets/sahaay-logo.png";

// Renders the Sahaay brand logo image.
const SahaayLogo = ({ size = 36 }) => (
  <img
    src={sahaayLogoSrc}
    alt="Sahaay logo"
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "block",
      flexShrink: 0,
    }}
  />
);

export default SahaayLogo;