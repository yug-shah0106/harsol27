/** The team's public contact (client, 2026-10-20): the footer, the floating "Talk to us" button and the Privacy page. */
export const CONTACT = {
  whatsapp: "+91 91520 00352",
  whatsappLink: "https://wa.me/919152000352",
  email: "sh27jyt@gmail.com",
  // The trust's address (client, 2026-10-23), on the Contact us page. "8V42+7JV" is its Google Maps Plus Code.
  address: ["8V42+7JV, Devchand Nagar, Sripal Nagar", "Bhayandar West, Mira Bhayandar", "Maharashtra 401101"],
  // The sellers' WhatsApp group new registrants are invited to: in their confirmation email (client, 2026-10-21)
  // and on the form's thank-you (2026-10-30).
  whatsappGroupLink: "https://chat.whatsapp.com/GEfoxJohXeT5I1cl3mvT1k",
};

export const ADDRESS_MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address.join(", "))}`;
