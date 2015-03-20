closed_height = ->
  $('#logo-bar').outerHeight(true) + $('.navbar').outerHeight(true)

open_height = ->
  closed_height() + $('#menu').outerHeight()

toggle_menu = ->
  menu = $('#menu')
  header = $('header')
  ms = $('#header-space')
  if menu.data('visible')
    menu.data('visible', false)
    ms.animate({height: closed_height() }, 500)
    menu.slideUp(500)
  else
    menu.data('visible', true)
    ms.animate({height: open_height()}, 500)
    menu.slideDown(500)

show_menu_tab = (target) ->
  menu = $('#menu')
  ms = $('#header-space')
  selected = menu.data 'selected'
  if selected != target
    menu.data 'selected', target
    $(selected).removeClass('active')
    $(target).addClass 'active'
    if selected
      if selected.id.match /all$/
        pane = $('.menu-pane')
      else
        pane = $('#' + selected.id.replace(/tab/, 'pane'))
      pane.removeClass('active').addClass('hide')
    if target.id.match /all$/
      pane = $('.menu-pane')
    else
      pane = $('#' + target.id.replace(/tab/, 'pane'))
    pane.addClass('active').removeClass('hide')
    ms.height($('header').outerHeight())

$('.menu-toggle-target').click toggle_menu
$('.menu-tab').click (e) ->
  show_menu_tab this

show_menu_tab $('.menu-tab')[0]
