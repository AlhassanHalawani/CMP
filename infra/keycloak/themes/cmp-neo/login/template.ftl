<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true>
<!DOCTYPE html>
<html lang="${locale.currentLanguageTag}"<#if locale.currentLanguageTag == "ar"> dir="rtl"</#if>>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CMP</title>
  <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css">
</head>
<body>
  <div class="cmp-page">
    <div class="cmp-card">

      <div class="cmp-brand-block">
        <h1 class="cmp-brand-title">CMP</h1>
        <p class="cmp-brand-sub">${msg("appSubtitle")}</p>
      </div>

      <#if displayMessage && message?has_content>
        <div class="cmp-alert cmp-alert--${message.type}" role="alert">
          ${kcSanitize(message.summary)?no_esc}
        </div>
      </#if>

      <#nested>

      <#if realm.internationalizationEnabled && locale.supported?has_content && (locale.supported?size gt 1)>
        <div class="cmp-locale-bar">
          <#list locale.supported as l>
            <a href="${l.url}" class="cmp-locale-link<#if l.languageTag == locale.currentLanguageTag> cmp-locale-link--active</#if>">${l.label}</a>
          </#list>
        </div>
      </#if>

    </div>
  </div>
</body>
</html>
</#macro>
