$(function () {
  $("a").tooltip();
  // Utilize the modernzr feature support class to detect CSS 3D transform support
  if ($('html').hasClass('csstransforms3d')) {
    // if it's supported, remove the scroll effect add the cool card flipping instead
    $('.project').removeClass('scroll').addClass('flip');
    // add/remove flip class that make the transition effect
    $('.project.flip').hover(
      function () {
        $(this).find('.project-wrapper').addClass('flipIt');
      },
      function () {
        $(this).find('.project-wrapper').removeClass('flipIt');
      }
    );
  } else {
    // CSS 3D is not supported, use the scroll up effect instead
    $('.project').hover(
      function () {
        $(this).find('.project-detail').stop().animate({bottom:0}, 500, 'easeOutCubic');
      },
      function () {
        $(this).find('.project-detail').stop().animate({bottom: ($(this).height() * -1) }, 500, 'easeOutCubic');
      }
    );
  }
});
