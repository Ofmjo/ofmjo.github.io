<div id="mytagline">
<?php   
$i = 1;
while($i <= 50){
$txt = file('mem.txt');
$str = $txt[ array_rand($txt) ]; 
unset($txt); 
echo $str.'<br>'; 
$i++;
}
?>
</div>