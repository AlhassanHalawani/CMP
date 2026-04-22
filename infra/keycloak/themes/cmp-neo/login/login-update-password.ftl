<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!(messagesPerField.existsError("password-new","password-new-confirm"))>

  <h2 class="cmp-form-title">${msg("updatePasswordTitle")}</h2>

  <form id="kc-passwd-update-form" action="${url.loginAction}" method="post">

    <input type="text" id="username" name="username" value="${username!""}"
           autocomplete="username" readonly style="display:none;">

    <div class="cmp-field">
      <label class="cmp-label" for="password-new">${msg("passwordNew")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("password-new")> cmp-input--error</#if>"
             id="password-new" name="password-new" type="password"
             autofocus autocomplete="new-password">
      <#if messagesPerField.existsError("password-new")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("password-new"))?no_esc}</span>
      </#if>
    </div>

    <div class="cmp-field">
      <label class="cmp-label" for="password-new-confirm">${msg("passwordNewConfirm")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("password-new-confirm")> cmp-input--error</#if>"
             id="password-new-confirm" name="password-new-confirm" type="password"
             autocomplete="new-password">
      <#if messagesPerField.existsError("password-new-confirm")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("password-new-confirm"))?no_esc}</span>
      </#if>
    </div>

    <#if isAppInitiatedAction!false>
    <div class="cmp-field cmp-field--inline">
      <label class="cmp-checkbox-label">
        <input class="cmp-checkbox" type="checkbox" id="logout-sessions" name="logout-sessions" value="on" checked>
        <span>${msg("logoutOtherSessions")}</span>
      </label>
    </div>
    </#if>

    <button class="cmp-btn cmp-btn--primary" type="submit" name="login">
      ${msg("doSave")}
    </button>

    <#if isAppInitiatedAction!false>
    <button class="cmp-btn cmp-btn--secondary" type="submit" name="cancel-aia" value="true">
      ${msg("doCancel")}
    </button>
    </#if>

  </form>

</@layout.registrationLayout>
