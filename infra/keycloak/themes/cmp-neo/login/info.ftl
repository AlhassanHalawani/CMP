<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false>

  <h2 class="cmp-form-title">
    <#if message.type == "success">${msg("successTitle")!"Success"}
    <#else>${msg("infoTitle")!"Information"}</#if>
  </h2>

  <#if message?has_content>
    <p class="cmp-info-text">${kcSanitize(message.summary)?no_esc}</p>
  </#if>

  <#if pageRedirectUri?has_content>
    <a class="cmp-btn cmp-btn--primary" href="${pageRedirectUri}">
      ${msg("backToApplication")!"Continue"}
    </a>
  <#elseif actionUri?has_content>
    <a class="cmp-btn cmp-btn--primary" href="${actionUri}">
      ${msg("proceedWithAction")!"Continue"}
    </a>
  <#else>
    <a class="cmp-btn cmp-btn--primary" href="${url.loginUrl}">
      ${msg("backToLogin")}
    </a>
  </#if>

</@layout.registrationLayout>
