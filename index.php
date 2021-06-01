<html>
	<head>
		<title>BTC-GENERATOR</title>
		<link rel="shortcut icon" href="favicon.png" type="image/png">
		<link rel='stylesheet' type='text/css' href='style.css'>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
		<script src="https://www.mattboldt.com/demos/typed-js/js/typed.custom.js"></script>
		<script src="script.js"></script>
	</head>
   <nav>
    <ul class="navigation">
      <li><a href="/">Home</a></li>
      <li><a href="https://www.blockchain.com/">BLOCKCHAIN</a></li>
      <li><a href="https://www.smartbit.com.au/">SMARTBIT</a></li>
      <li><a href="https://github.com/Anarbb/BitGen">GITHUB SOURCE</a></li>
    </ul>
	</nav>
<div class="terminal-window">
  <header>
    <div class="button green"></div>
    <div class="button yellow"></div>
    <div class="button red"></div>
  </header>
  <section class="terminal">
    <div class="history"></div>
    $&nbsp;<span class="prompt"></span>
    <span class="typed-cursor"></span>
    
  </section>
</div>
<!-- data -->
  <div class="terminal-data mimik-run-output">
 <br>Found 50 feature<br>
 ----------------------------------------------<br>
 Feature: BTC ADDRESS  <br><span class="gray"># BIN-HEX: 0x{0:0{1}x}</span><br><span class="gray"># WORDS: ./bitcoin/bips/master/bip-0039/english.txt</span><br><br>

 &nbsp;&nbsp;Scenario: Generated 50 bitcoin addresses + recovery phrase<br>
    &nbsp;&nbsp;&nbsp;&nbsp;<span class="green">✓</span> <span class="gray">Server connection was made</span><br>
 &nbsp;&nbsp;&nbsp;&nbsp;<span class="green">✓</span> <span class="gray">Recovery phrases have been loaded</span><br>
 &nbsp;&nbsp;&nbsp;&nbsp;<span class="green">✓</span> <span class="gray">Addresses have been generated</span><br>
 <br>
	<span class="gray">&nbsp;----------------------------------------------------------------------------------------</span><br>
	<span class="gray"><?php include "mem.php";?></span>
    <span class="gray">&nbsp;----------------------------------------------------------------------------------------</span><br>
  <br>
  <?php $time = rand(11,57);?>
&nbsp;&nbsp;Completed 50 feature in 1.<?php echo $time;?>s<br>
&nbsp;&nbsp;Click to <a class="green" style="text-decoration:none;" href="javascript:window.location.reload()">Refresh page</a>
  <br>
</div>
