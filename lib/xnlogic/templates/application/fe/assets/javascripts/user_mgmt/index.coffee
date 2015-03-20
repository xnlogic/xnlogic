# NOTE: DKC Oct 3, 2014 - Do we need jquery_ujs still?
# require jquery_ujs
#= require ./menu

bindLogoutLink = ->
  $('[data-event=logout]').click (e) ->
    clear_tokens()
    window.location = '/login'
    e.stopPropagation()
    true

decorateSelects = ->
  $('.multi-select').select2()

setupUsersList = ->
  $('.btn-user-action').on 'ajax:success', (data, xhr, status) ->
    #TODO HACK Change to change the button in place -SH (07/06)
    location.reload(true)

$ ->
  bindLogoutLink()
  decorateSelects()
  setupUsersList()
