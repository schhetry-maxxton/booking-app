
export function randomNo(){
    let num=Math.floor(Math.random() * 900000 + 100000);
    console.log(num);
    // return num;
    document.getElementById("randomNum").innerText=num;
}