function resolveBannerUrl(panel, panelsConfig = {}) {
  return (
    panel.image ??
    panel.bannerImage ??
    panelsConfig.bannerImage ??
    panelsConfig.footerIcon
  );
}

function applyPanelFooter(embed, panel, panelsConfig = {}) {
  if (panel.footer) {
    embed.setFooter({ text: panel.footer });
  }

  const thumbnail = panel.thumbnail ?? panelsConfig.thumbnail;
  if (thumbnail) embed.setThumbnail(thumbnail);

  const banner = resolveBannerUrl(panel, panelsConfig);
  if (banner) embed.setImage(banner);

  return embed;
}

module.exports = { applyPanelFooter, resolveBannerUrl };
