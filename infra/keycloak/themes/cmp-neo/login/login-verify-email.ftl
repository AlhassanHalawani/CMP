<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false>

  <h2 class="cmp-form-title">${msg("emailVerifyTitle")}</h2>

  <p class="cmp-info-text">
    ${msg("emailVerifyInstruction1", (user.email!""))}
  </p>

  <p class="cmp-info-text">
    ${msg("emailVerifyInstruction2")}
    <a href="${url.loginAction}">${msg("doClickHere")}</a>
    ${msg("emailVerifyInstruction3")!""}
  </p>

</@layout.registrationLayout>
