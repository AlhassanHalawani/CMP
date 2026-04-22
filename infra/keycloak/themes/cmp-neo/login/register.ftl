<#import "template.ftl" as layout>
<@layout.registrationLayout>

  <h2 class="cmp-form-title">${msg("registerTitle")}</h2>

  <form id="kc-register-form" action="${url.registrationAction}" method="post">

    <div class="cmp-field">
      <label class="cmp-label" for="firstName">${msg("firstName")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("firstName")> cmp-input--error</#if>"
             id="firstName" name="firstName" type="text"
             value="${register.formData.firstName!""}"
             autofocus>
      <#if messagesPerField.existsError("firstName")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("firstName"))?no_esc}</span>
      </#if>
    </div>

    <div class="cmp-field">
      <label class="cmp-label" for="lastName">${msg("lastName")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("lastName")> cmp-input--error</#if>"
             id="lastName" name="lastName" type="text"
             value="${register.formData.lastName!""}">
      <#if messagesPerField.existsError("lastName")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("lastName"))?no_esc}</span>
      </#if>
    </div>

    <#if !realm.registrationEmailAsUsername>
    <div class="cmp-field">
      <label class="cmp-label" for="username">${msg("username")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("username")> cmp-input--error</#if>"
             id="username" name="username" type="text"
             value="${register.formData.username!""}">
      <#if messagesPerField.existsError("username")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("username"))?no_esc}</span>
      </#if>
    </div>
    </#if>

    <div class="cmp-field">
      <label class="cmp-label" for="email">${msg("email")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("email")> cmp-input--error</#if>"
             id="email" name="email" type="email"
             value="${register.formData.email!""}"
             autocomplete="email">
      <#if messagesPerField.existsError("email")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("email"))?no_esc}</span>
      </#if>
    </div>

    <#if passwordRequired??>
    <div class="cmp-field">
      <label class="cmp-label" for="password">${msg("password")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("password","password-confirm")> cmp-input--error</#if>"
             id="password" name="password" type="password"
             autocomplete="new-password">
      <#if messagesPerField.existsError("password")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("password"))?no_esc}</span>
      </#if>
    </div>

    <div class="cmp-field">
      <label class="cmp-label" for="password-confirm">${msg("passwordConfirm")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("password-confirm")> cmp-input--error</#if>"
             id="password-confirm" name="password-confirm" type="password"
             autocomplete="new-password">
      <#if messagesPerField.existsError("password-confirm")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("password-confirm"))?no_esc}</span>
      </#if>
    </div>
    </#if>

    <button class="cmp-btn cmp-btn--primary" type="submit">
      ${msg("doRegister")}
    </button>

  </form>

  <div class="cmp-links">
    <a href="${url.loginUrl}">${msg("backToLogin")}</a>
  </div>

</@layout.registrationLayout>
