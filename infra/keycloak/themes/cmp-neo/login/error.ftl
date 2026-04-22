<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false>

  <h2 class="cmp-form-title">${msg("errorTitle")!"Error"}</h2>

  <div class="cmp-alert cmp-alert--error">
    ${kcSanitize(message.summary)?no_esc}
  </div>

  <#if !(skipLink?? && skipLink)>
    <div class="cmp-links">
      <#if client?? && client.baseUrl?has_content>
        <a href="${client.baseUrl}">${msg("backToApplication")!"Back to App"}</a>
      <#else>
        <a href="${url.loginUrl}">${msg("backToLogin")}</a>
      </#if>
    </div>
  </#if>

</@layout.registrationLayout>
