$(function() {
  var data = [
  { 
    action: 'type',
    strings: ["gethost api.smartbit.com.au/v1/blockchain"],
    output: '<span class="gray">HOST: 216.58.192.142</span><br><span class="gray">VERSION: v1</span><br><span class="green">STATUS: OK</span><br>&nbsp;',
    postDelay: 1000
  },
  { 
    action: 'type',
    strings: ["connect 216.58.192.142"],
    output: '<span class="green">Connected to 216.58.192.142</span><br>&nbsp;',
    postDelay: 1000
  },
  { 
    action: 'type',
    //clear: true,
    strings: ['generate btc-addr 50'],
    output: $('.mimik-run-output').html(),
	postDelay: 1000
  }
  
  /*{ 
    action: 'type',
    strings: [''],
    postDelay: 2000
  }*/
];
  runScripts(data, 0);
});

function runScripts(data, pos) {
    var prompt = $('.prompt'),
        script = data[pos];
    if(script.clear === true) {
      $('.history').html(''); 
    }
    switch(script.action) {
        case 'type':
          // cleanup for next execution
          prompt.removeData();
          $('.typed-cursor').text('');
          prompt.typed({
            strings: script.strings,
            typeSpeed: 30,
            callback: function() {
              var history = $('.history').html();
              history = history ? [history] : [];
              history.push('$ ' + prompt.text());
              if(script.output) {
                history.push(script.output);
                prompt.html('');
                $('.history').html(history.join('<br>'));
              }
              // scroll to bottom of screen
              $('section.terminal').scrollTop($('section.terminal').height());
              // Run next script
              pos++;
              if(pos < data.length) {
                setTimeout(function() {
                  runScripts(data, pos);
                }, script.postDelay || 1000);
              }
            }
          });
          break;
        case 'view':

          break;
    }
}